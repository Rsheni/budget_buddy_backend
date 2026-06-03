const Group = require('../../infrastructure/models/Group');
const GroupMember = require('../../infrastructure/models/GroupMember');
const User = require('../../infrastructure/models/User');
const SharedExpense = require('../../infrastructure/models/SharedExpense');
const ExpenseSplit = require('../../infrastructure/models/ExpenseSplit');
const GroupInvitation = require('../../infrastructure/models/GroupInvitation');
const { sendGroupInvitationEmail } = require('../../infrastructure/services/emailService');
const { generateInvitationCode } = require('../../infrastructure/utils/invitationCode');

const createGroup = async (req, res) => {
    try {
        const { groupName, members } = req.body;
        const adminId = req.user._id;

        let coverPhoto = "";
        if (req.file) {
            coverPhoto = req.file.path.replace('\\', '/');
        }

        if (!groupName) {
            return res.status(400).json({ message: "Group name is required" });
        }

        // 1. Create the Group
        const newGroup = await Group.create({
            adminId,
            groupName,
            coverPhoto
        });

        // 2. Add admin as a member
        await GroupMember.create({
            groupId: newGroup._id,
            userId: adminId,
            isActive: true
        });

        // 3. Find and add invited members
        let parsedMembers = [];
        try {
            parsedMembers = typeof members === 'string' ? JSON.parse(members) : members;
        } catch (e) {
            parsedMembers = members || [];
        }

        if (Array.isArray(parsedMembers) && parsedMembers.length > 0) {
            for (const identifier of parsedMembers) {
                // identifier could be email or phone
                const invitedUser = await User.findOne({
                    $or: [{ email: identifier }, { phoneNumber: identifier }]
                });

                if (invitedUser) {
                    // Only create GroupMember if it's not the admin (admin is already added)
                    if (invitedUser._id.toString() !== adminId.toString()) {
                        await GroupMember.create({
                            groupId: newGroup._id,
                            userId: invitedUser._id,
                            isActive: true
                        });
                    }
                    
                    // Generate a unique invitation code
            const invitationCode = await generateInvitationCode();
            // Store invitation with code
            await GroupInvitation.create({
                groupId: newGroup._id,
                emailOrPhone: identifier,
                code: invitationCode,
                status: 'pending',
                invitedBy: adminId
            });
            // Send email with code
            await sendGroupInvitationEmail(identifier, req.user.name, groupName, invitationCode);
                } else if (!invitedUser) {
                    // Generate a unique invitation code
            const invitationCode = await generateInvitationCode();
            // Store invitation with code
            await GroupInvitation.create({
                groupId: newGroup._id,
                emailOrPhone: identifier,
                code: invitationCode,
                status: 'pending',
                invitedBy: adminId
            });
            // Send email with code
            await sendGroupInvitationEmail(identifier, req.user.name, groupName, invitationCode);
                }
            }
        }

        res.status(201).json({
            message: "Group created successfully",
            group: newGroup
        });
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getGroups = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find all active group memberships for this user
        const memberships = await GroupMember.find({ userId, isActive: true }).select('groupId');
        const groupIds = memberships.map(m => m.groupId);

        // Fetch groups
        const groups = await Group.find({ _id: { $in: groupIds }, isActive: true })
            .populate('adminId', 'name email profilePicture')
            .lean();

        // For each group, fetch members and calculate some placeholder stats (until transactions exist)
        const groupsWithDetails = await Promise.all(groups.map(async (group) => {
            const members = await GroupMember.find({ groupId: group._id, isActive: true })
                .populate('userId', 'name email profilePicture')
                .lean();
            
            // Format members
            const formattedMembers = members.map(m => ({
                id: m.userId?._id,
                name: m.userId?.name,
                email: m.userId?.email,
                profilePicture: m.userId?.profilePicture || 'https://ui-avatars.com/api/?name=' + (m.userId?.name || 'U')
            }));

            // Fetch all expenses in the group
            const expenses = await SharedExpense.find({ groupId: group._id }).lean();
            const totalSpend = expenses.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);

            // Fetch all expense splits in the group
            const expenseIds = expenses.map(e => e._id);
            const splits = await ExpenseSplit.find({ sharedExpenseId: { $in: expenseIds } }).lean();
            
            // Fetch all settlements in the group
            const Settlement = require('../../infrastructure/models/Settlement');
            const settlements = await Settlement.find({ groupId: group._id, status: 'completed' }).lean();

            // Calculate debts between each pair
            const debts = {};
            const memberIds = [userId.toString()];
            members.forEach(m => {
                if (m.userId) {
                    const mId = m.userId._id.toString();
                    if (!memberIds.includes(mId)) memberIds.push(mId);
                }
            });

            memberIds.forEach(id1 => {
                debts[id1] = {};
                memberIds.forEach(id2 => {
                    debts[id1][id2] = 0;
                });
            });

            // Accumulate unpaid splits
            for (const exp of expenses) {
                const payerIdStr = exp.addedBy.toString();
                if (!memberIds.includes(payerIdStr)) continue;

                const expSplits = splits.filter(s => s.sharedExpenseId.toString() === exp._id.toString());
                for (const split of expSplits) {
                    const participantIdStr = split.userId.toString();
                    if (!memberIds.includes(participantIdStr)) continue;
                    if (participantIdStr !== payerIdStr && !split.isPaid) {
                        debts[participantIdStr][payerIdStr] += split.splitAmount;
                    }
                }
            }

            // Subtract settlements
            for (const set of settlements) {
                const pIdStr = set.payerId.toString();
                const rIdStr = set.receiverId.toString();
                if (debts[pIdStr] && debts[pIdStr][rIdStr] !== undefined) {
                    debts[pIdStr][rIdStr] -= set.amount;
                }
            }

            // Consolidate pairwise debts for the current user
            let youOweAmount = 0;
            let receiveAmount = 0;
            const uid = userId.toString();

            memberIds.forEach(otherId => {
                if (otherId !== uid) {
                    const net = debts[uid][otherId] - debts[otherId][uid];
                    if (net > 0.01) {
                        youOweAmount += net; // I owe them
                    } else if (net < -0.01) {
                        receiveAmount += Math.abs(net); // They owe me
                    }
                }
            });

            let type = 'settled';
            if (youOweAmount > receiveAmount) {
                type = 'owe';
            } else if (receiveAmount > youOweAmount) {
                type = 'receive';
            }

            return {
                id: group._id,
                name: group.groupName,
                coverPhoto: group.coverPhoto,
                creator: group.adminId.name,
                creatorId: group.adminId._id,
                members: formattedMembers,
                type: type,
                youOweAmount: youOweAmount,
                totalSpend: totalSpend,
                receiveAmount: receiveAmount,
                receivedAmount: receiveAmount
            };
        }));

        res.status(200).json({
            message: 'Groups fetched successfully',
            groups: groupsWithDetails
        });
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getGroupExpenses = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Check if user is a member of the group
        const isMember = await GroupMember.findOne({ groupId, userId, isActive: true });
        if (!isMember) {
            return res.status(403).json({ message: "You are not an active member of this group" });
        }

        const expenses = await SharedExpense.find({ groupId })
            .populate('addedBy', 'name profilePicture')
            .sort({ expenseDate: -1 })
            .lean();

        // Calculate real financial data based on expenses and splits
        let totalSpend = 0;
        let totalPaidByMe = 0;
        let myTotalShare = 0;

        const formattedExpenses = [];

        for (const exp of expenses) {
            totalSpend += (exp.totalAmount || 0);
            if (exp.addedBy?._id.toString() === userId.toString()) {
                totalPaidByMe += (exp.totalAmount || 0);
            }

            const splits = await ExpenseSplit.find({ sharedExpenseId: exp._id })
                .populate('userId', 'name')
                .lean();

            const mySplit = splits.find(s => s.userId.toString() === userId.toString());
            if (mySplit) {
                myTotalShare += (mySplit.splitAmount || 0);
            } else if (exp.splitMethod === 'equal' && splits.length === 0) {
                // Fallback for old expenses without ExpenseSplit records
                const membersCount = await GroupMember.countDocuments({ groupId, isActive: true });
                if (membersCount > 0) {
                    myTotalShare += ((exp.totalAmount || 0) / membersCount);
                }
            }

            formattedExpenses.push({
                id: exp._id,
                title: exp.description,
                paidBy: exp.addedBy?.name || 'Unknown',
                paidById: exp.addedBy?._id,
                amount: exp.totalAmount,
                date: exp.expenseDate,
                icon: 'receipt', // Placeholder icon
                color: '#E0E7FF', // Placeholder color
                splits: splits.map(s => ({
                    userId: s.userId?._id,
                    userName: s.userId?.name || 'Unknown',
                    splitAmount: s.splitAmount,
                    isPaid: s.isPaid
                }))
            });
        }

        const balance = totalPaidByMe - myTotalShare;
        const receiveAmount = balance > 0 ? balance : 0;
        const youOweAmount = balance < 0 ? Math.abs(balance) : 0;

        res.status(200).json({ 
            expenses: formattedExpenses,
            summary: {
                totalSpend,
                receiveAmount,
                youOweAmount
            }
        });
    } catch (error) {
        console.error('Get group expenses error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getGroupBalances = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Check membership
        const isMember = await GroupMember.findOne({ groupId, userId, isActive: true });
        if (!isMember) {
            return res.status(403).json({ message: "You are not an active member of this group" });
        }

        // Fetch all active members in the group
        const groupMembers = await GroupMember.find({ groupId, isActive: true })
            .populate('userId', 'name email profilePicture')
            .lean();

        const memberMap = {};
        groupMembers.forEach(m => {
            if (m.userId) {
                memberMap[m.userId._id.toString()] = {
                    id: m.userId._id,
                    name: m.userId.name,
                    email: m.userId.email,
                    profilePicture: m.userId.profilePicture || 'https://ui-avatars.com/api/?name=' + (m.userId.name || 'U')
                };
            }
        });

        // Fetch all expenses in the group
        const expenses = await SharedExpense.find({ groupId }).lean();
        // Fetch all expense splits in the group
        const expenseIds = expenses.map(e => e._id);
        const splits = await ExpenseSplit.find({ sharedExpenseId: { $in: expenseIds } }).lean();
        
        // Fetch all settlements in the group
        const Settlement = require('../../infrastructure/models/Settlement');
        const settlements = await Settlement.find({ groupId, status: 'completed' }).lean();

        // Calculate debts between each pair
        // debts[fromUserId][toUserId] = amount
        const debts = {};
        const memberIds = Object.keys(memberMap);
        memberIds.forEach(id1 => {
            debts[id1] = {};
            memberIds.forEach(id2 => {
                debts[id1][id2] = 0;
            });
        });

        // 1. Accumulate unpaid splits
        // If participant split.userId is not payer expense.addedBy, participant owes split.splitAmount to payer.
        for (const exp of expenses) {
            const payerIdStr = exp.addedBy.toString();
            const expSplits = splits.filter(s => s.sharedExpenseId.toString() === exp._id.toString());
            
            for (const split of expSplits) {
                const participantIdStr = split.userId.toString();
                if (participantIdStr !== payerIdStr && !split.isPaid) {
                    if (debts[participantIdStr] && debts[participantIdStr][payerIdStr] !== undefined) {
                        debts[participantIdStr][payerIdStr] += split.splitAmount;
                    }
                }
            }
        }

        // 2. Subtract settlements
        for (const set of settlements) {
            const pIdStr = set.payerId.toString();
            const rIdStr = set.receiverId.toString();
            if (debts[pIdStr] && debts[pIdStr][rIdStr] !== undefined) {
                debts[pIdStr][rIdStr] -= set.amount;
            }
        }

        // 3. Consolidate pairwise debts
        const debtsToPay = [];
        const debtsToReceive = [];
        let totalSpend = expenses.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0);

        for (let i = 0; i < memberIds.length; i++) {
            for (let j = i + 1; j < memberIds.length; j++) {
                const idA = memberIds[i];
                const idB = memberIds[j];
                const net = debts[idA][idB] - debts[idB][idA];

                if (Math.abs(net) > 0.01) {
                    const uA = memberMap[idA];
                    const uB = memberMap[idB];

                    if (net > 0) {
                        // idA owes idB
                        if (idA === userId.toString()) {
                            debtsToPay.push({
                                memberId: uB.id,
                                name: uB.name,
                                profilePicture: uB.profilePicture,
                                amount: net
                            });
                        } else if (idB === userId.toString()) {
                            debtsToReceive.push({
                                memberId: uA.id,
                                name: uA.name,
                                profilePicture: uA.profilePicture,
                                amount: net
                            });
                        }
                    } else {
                        // idB owes idA
                        const absNet = Math.abs(net);
                        if (idB === userId.toString()) {
                            debtsToPay.push({
                                memberId: uA.id,
                                name: uA.name,
                                profilePicture: uA.profilePicture,
                                amount: absNet
                            });
                        } else if (idA === userId.toString()) {
                            debtsToReceive.push({
                                memberId: uB.id,
                                name: uB.name,
                                profilePicture: uB.profilePicture,
                                amount: absNet
                            });
                        }
                    }
                }
            }
        }

        const receiveAmount = debtsToReceive.reduce((sum, d) => sum + d.amount, 0);
        const youOweAmount = debtsToPay.reduce((sum, d) => sum + d.amount, 0);

        res.status(200).json({
            summary: {
                totalSpend,
                receiveAmount,
                youOweAmount
            },
            debtsToReceive,
            debtsToPay,
            members: Object.values(memberMap)
        });

    } catch (error) {
        console.error('Get group balances error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const createSettlement = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { receiverId, amount, paymentMethod, notes, bankDetails } = req.body;
        const payerId = req.user._id;

        if (!receiverId || !amount) {
            return res.status(400).json({ message: "Receiver ID and amount are required" });
        }

        // Verify group membership of both payer and receiver
        const payerMember = await GroupMember.findOne({ groupId, userId: payerId, isActive: true });
        const receiverMember = await GroupMember.findOne({ groupId, userId: receiverId, isActive: true });

        if (!payerMember || !receiverMember) {
            return res.status(403).json({ message: "Payer or Receiver is not an active member of this group" });
        }

        const Settlement = require('../../infrastructure/models/Settlement');
        const newSettlement = await Settlement.create({
            groupId,
            payerId,
            receiverId,
            amount: Number(amount),
            paymentMethod: paymentMethod || 'cash',
            notes: notes || "",
            bankDetails: paymentMethod === 'bank' ? bankDetails : undefined,
            status: 'completed'
        });

        res.status(201).json({
            message: "Settlement recorded successfully",
            settlement: newSettlement
        });
    } catch (error) {
        console.error('Create settlement error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getGroupSettlements = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const isMember = await GroupMember.findOne({ groupId, userId, isActive: true });
        if (!isMember) {
            return res.status(403).json({ message: "You are not an active member of this group" });
        }

        const Settlement = require('../../infrastructure/models/Settlement');
        const settlements = await Settlement.find({ groupId, status: 'completed' })
            .populate('payerId', 'name profilePicture')
            .populate('receiverId', 'name profilePicture')
            .sort({ settlementDate: -1 })
            .lean();

        const totalSettled = settlements.reduce((sum, s) => sum + (s.amount || 0), 0);

        res.status(200).json({
            totalSettled,
            settlements: settlements.map(s => ({
                id: s._id,
                payer: s.payerId?.name || 'Unknown',
                payerId: s.payerId?._id,
                receiver: s.receiverId?.name || 'Unknown',
                receiverId: s.receiverId?._id,
                amount: s.amount,
                date: s.settlementDate,
                paymentMethod: s.paymentMethod,
                notes: s.notes
            }))
        });
    } catch (error) {
        console.error('Get group settlements error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const addGroupExpense = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { description, totalAmount, paidById, splitMethod, splits } = req.body;

        if (!description || !totalAmount) {
            return res.status(400).json({ message: "Description and totalAmount are required" });
        }

        // Check if user is a member
        const isMember = await GroupMember.findOne({ groupId, userId: req.user._id, isActive: true });
        if (!isMember) {
            return res.status(403).json({ message: "You are not an active member of this group" });
        }

        let receiptImage = "";
        if (req.file) {
            receiptImage = req.file.path.replace('\\', '/');
        }

        const newExpense = await SharedExpense.create({
            groupId,
            addedBy: paidById || req.user._id,
            description,
            totalAmount: Number(totalAmount),
            expenseDate: new Date(),
            splitMethod: splitMethod || 'equal',
            receiptImage
        });

        // Parse splits
        let parsedSplits = [];
        try {
            parsedSplits = typeof splits === 'string' ? JSON.parse(splits) : splits;
        } catch (e) {
            parsedSplits = [];
        }

        if (parsedSplits && parsedSplits.length > 0) {
            const expenseSplitsToCreate = parsedSplits.map(split => {
                let amountToOwe = 0;
                if (splitMethod === 'equal') {
                    amountToOwe = Number(totalAmount) / parsedSplits.length;
                } else if (splitMethod === 'percentage') {
                    amountToOwe = (Number(totalAmount) * Number(split.percentage)) / 100;
                } else if (splitMethod === 'exact') {
                    amountToOwe = Number(split.amount);
                }

                return {
                    sharedExpenseId: newExpense._id,
                    userId: split.userId,
                    splitAmount: amountToOwe,
                    isPaid: split.userId === (paidById || req.user._id.toString()) // Paid by payer implicitly
                };
            });

            await ExpenseSplit.insertMany(expenseSplitsToCreate);
        }

        const populatedExpense = await SharedExpense.findById(newExpense._id)
            .populate('addedBy', 'name profilePicture')
            .lean();

        const formattedExpense = {
            id: populatedExpense._id,
            title: populatedExpense.description,
            paidBy: populatedExpense.addedBy?.name || 'Unknown',
            amount: populatedExpense.totalAmount,
            date: populatedExpense.expenseDate,
            icon: 'receipt',
            color: '#E0E7FF'
        };

        res.status(201).json({ message: "Expense added", expense: formattedExpense });
    } catch (error) {
        console.error('Add group expense error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { groupName } = req.body;
        
        // Ensure user is the group admin
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        if (group.adminId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the group admin can update group settings" });
        }

        const updateData = {};
        if (groupName) updateData.groupName = groupName;
        if (req.file) {
            updateData.coverPhoto = req.file.path.replace('\\', '/');
        }

        const updatedGroup = await Group.findByIdAndUpdate(groupId, updateData, { new: true });
        res.status(200).json({ message: "Group updated", group: updatedGroup });
    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getGroupSettings = async (req, res) => {
    try {
        const { groupId } = req.params;
        const isMember = await GroupMember.findOne({ groupId, userId: req.user._id, isActive: true });
        if (!isMember) {
            return res.status(403).json({ message: "You are not an active member of this group" });
        }

        const group = await Group.findById(groupId).populate('adminId', 'name email').lean();
        if (!group) return res.status(404).json({ message: "Group not found" });

        const members = await GroupMember.find({ groupId, isActive: true })
            .populate('userId', 'name email profilePicture')
            .lean();

        const formattedMembers = members.map(m => ({
            id: m.userId?._id,
            name: m.userId?.name,
            email: m.userId?.email,
            profilePicture: m.userId?.profilePicture || 'https://ui-avatars.com/api/?name=' + (m.userId?.name || 'U'),
            joinedAt: m.joinedAt,
            isAdmin: m.userId?._id.toString() === group.adminId._id.toString()
        }));

        const pendingInvitations = await GroupInvitation.find({ groupId, status: 'pending' }).lean();

        res.status(200).json({
            group: {
                id: group._id,
                name: group.groupName,
                coverPhoto: group.coverPhoto,
                adminId: group.adminId._id
            },
            members: formattedMembers,
            pendingInvitations: pendingInvitations.map(inv => ({
                id: inv._id,
                emailOrPhone: inv.emailOrPhone,
                status: inv.status
            }))
        });
    } catch (error) {
        console.error('Get group settings error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const addMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { members } = req.body;
        
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        if (group.adminId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the group admin can add members" });
        }

        let parsedMembers = [];
        try {
            parsedMembers = typeof members === 'string' ? JSON.parse(members) : members;
        } catch (e) {
            parsedMembers = members || [];
        }

        const added = [];
        const invited = [];

        for (const identifier of parsedMembers) {
            const invitedUser = await User.findOne({
                $or: [{ email: identifier }, { phoneNumber: identifier }]
            });

            if (invitedUser) {
                const existing = await GroupMember.findOne({ groupId, userId: invitedUser._id });
                if (!existing) {
                    await GroupMember.create({ groupId, userId: invitedUser._id, isActive: true });
                    added.push(invitedUser.email || invitedUser.phoneNumber);
                } else if (!existing.isActive) {
                    existing.isActive = true;
                    await existing.save();
                    added.push(invitedUser.email || invitedUser.phoneNumber);
                }
            } else {
                const existingInv = await GroupInvitation.findOne({ groupId, emailOrPhone: identifier, status: 'pending' });
                if (!existingInv) {
                    const invitationCode = await generateInvitationCode();
                    await GroupInvitation.create({
                        groupId,
                        emailOrPhone: identifier,
                        code: invitationCode,
                        status: 'pending',
                        invitedBy: req.user._id
                    });
                    invited.push(identifier);
                    // Send invitation email if email
                    if (identifier.includes('@')) {
                        await sendGroupInvitationEmail(identifier, req.user.name, group.groupName, invitationCode);
                    }
                }
            }
        }
        res.status(200).json({ message: "Members processed", added, invited });
    } catch (error) {
        console.error('Add members error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const removeMember = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        
        // Either the user is removing themselves, or the user is the admin
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const isSelf = req.user._id.toString() === memberId;
        const isAdmin = group.adminId.toString() === req.user._id.toString();

        if (!isSelf && !isAdmin) {
            return res.status(403).json({ message: "You do not have permission to remove this member" });
        }

        if (group.adminId.toString() === memberId) {
            return res.status(400).json({ message: "Cannot remove the group admin" });
        }

        const member = await GroupMember.findOne({ groupId, userId: memberId });
        if (member) {
            member.isActive = false;
            await member.save();
        }

        res.status(200).json({ message: "Member removed successfully" });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const removeGroupExpense = async (req, res) => {
    try {
        const { groupId, expenseId } = req.params;

        const isMember = await GroupMember.findOne({ groupId, userId: req.user._id, isActive: true });
        if (!isMember) {
            return res.status(403).json({ message: "You are not an active member of this group" });
        }

        const expense = await SharedExpense.findById(expenseId);
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        // Only the person who added it or the group admin should be able to delete it
        const group = await Group.findById(groupId);
        const isAdmin = group && group.adminId.toString() === req.user._id.toString();
        const isOwner = expense.addedBy.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: "You don't have permission to delete this expense" });
        }

        await ExpenseSplit.deleteMany({ sharedExpenseId: expenseId });
        await SharedExpense.findByIdAndDelete(expenseId);

        res.status(200).json({ message: "Expense removed successfully" });
    } catch (error) {
        console.error('Remove group expense error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getPendingInvitations = async (req, res) => {
    try {
        const query = { status: 'pending' };
        const orConditions = [];
        if (req.user.email) {
            orConditions.push({ emailOrPhone: { $regex: new RegExp(`^${req.user.email}$`, 'i') } });
        }
        if (req.user.phoneNumber) {
            orConditions.push({ emailOrPhone: req.user.phoneNumber });
        }
        
        if (orConditions.length === 0) {
            return res.status(200).json({ invitations: [] });
        }
        
        query.$or = orConditions;
        
        const invitations = await GroupInvitation.find(query)
            .populate('groupId', 'groupName coverPhoto')
            .populate('invitedBy', 'name')
            .lean();
            
        res.status(200).json({
            invitations: invitations.map(inv => ({
                id: inv._id,
                groupId: inv.groupId?._id,
                groupName: inv.groupId?.groupName || 'Unknown Group',
                coverPhoto: inv.groupId?.coverPhoto || '',
                invitedBy: inv.invitedBy?.name || 'Someone',
                code: inv.code
            }))
        });
    } catch (error) {
        console.error('Get pending invitations error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const acceptInvitation = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: "Invitation code is required" });
        }
        
        const invitation = await GroupInvitation.findOne({
            code: code.trim(),
            status: 'pending'
        });
        
        if (!invitation) {
            return res.status(400).json({ message: "Invalid or expired invitation code" });
        }
        
        // Add user as member of the group
        let member = await GroupMember.findOne({ groupId: invitation.groupId, userId: req.user._id });
        if (!member) {
            await GroupMember.create({
                groupId: invitation.groupId,
                userId: req.user._id,
                isActive: true
            });
        } else {
            member.isActive = true;
            await member.save();
        }
        
        // Update invitation status
        invitation.status = 'accepted';
        await invitation.save();
        
        const group = await Group.findById(invitation.groupId);
        
        res.status(200).json({
            message: "Group invitation accepted successfully",
            group
        });
    } catch (error) {
        console.error('Accept invitation error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const cancelInvitation = async (req, res) => {
    try {
        const { groupId, invitationId } = req.params;
        
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        if (group.adminId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the group admin can cancel invitations" });
        }

        const invitation = await GroupInvitation.findById(invitationId);
        if (!invitation) return res.status(404).json({ message: "Invitation not found" });

        await GroupInvitation.findByIdAndDelete(invitationId);
        res.status(200).json({ message: "Invitation cancelled successfully" });
    } catch (error) {
        console.error('Cancel invitation error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        if (group.adminId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the group admin can delete the group" });
        }

        // Delete group related data
        await GroupInvitation.deleteMany({ groupId });
        await GroupMember.deleteMany({ groupId });
        
        const expenses = await SharedExpense.find({ groupId });
        const expenseIds = expenses.map(e => e._id);
        await ExpenseSplit.deleteMany({ sharedExpenseId: { $in: expenseIds } });
        await SharedExpense.deleteMany({ groupId });
        
        const Settlement = require('../../infrastructure/models/Settlement');
        await Settlement.deleteMany({ groupId });
        
        await Group.findByIdAndDelete(groupId);

        res.status(200).json({ message: "Group deleted successfully" });
    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createGroup,
    getGroups,
    getGroupExpenses,
    addGroupExpense,
    updateGroup,
    getGroupSettings,
    addMembers,
    removeMember,
    removeGroupExpense,
    getGroupBalances,
    createSettlement,
    getGroupSettlements,
    getPendingInvitations,
    acceptInvitation,
    cancelInvitation,
    deleteGroup
};
